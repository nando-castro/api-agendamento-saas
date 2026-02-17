import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, ValidateNested } from 'class-validator';

class ThemeVarsDto {
  // Record<string,string> (validação simples)
  [key: string]: any;
}

export class UpdateTenantThemeDto {
  @IsOptional()
  @IsIn(['light', 'dark', 'custom'])
  mode?: 'light' | 'dark' | 'custom';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeVarsDto)
  vars?: Record<string, string>;
}
